import shutil
from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory
from loguru import logger
from sqlalchemy import create_engine, inspect, text

from alembic import command
from src.core.config import settings
from src.diff_checker import SchemaDiff
from src.snapshotter.base_snapshotter import BaseSnapshotWorker


class AlembicSnapshotter(BaseSnapshotWorker):
    def __init__(self, work_dir: Path):
        super().__init__(work_dir)
        self.alembic_versions_dir = self._work_dir / settings.ALEMBIC_VERSIONS_DIRNAME

    def _perform_snapshot(
        self, db_url: str, project_name: str, target_revision: str
    ) -> tuple[str, str | None]:
        self._prepare_task_migrations(project_name)
        return self._get_snapshot(db_url, project_name, target_revision)

    def _prepare_task_migrations(self, project_name: str):
        project_dir = self.shared_dir / project_name / "input"
        if not project_dir.exists():
            raise Exception("Migrations not found")

        for f in self.alembic_versions_dir.glob("*.py"):
            f.unlink()

        for file in project_dir.glob("*.py"):
            shutil.copy(file, self.alembic_versions_dir)

    def _get_snapshot(
        self, db_url: str, project_name: str, target_revision: str
    ) -> tuple[str, str | None]:
        cfg = Config(settings.ALEMBIC_INI_PATH)
        cfg.set_main_option("sqlalchemy.url", db_url)
        script = ScriptDirectory.from_config(cfg)

        script_obj = script.get_revision(
            script.get_current_head() if target_revision == "head" else target_revision
        )
        if not script_obj:
            raise Exception(f"Revision {target_revision} not found")

        current_rev = script_obj.revision
        down_rev = (
            script_obj.down_revision[0]
            if isinstance(script_obj.down_revision, (tuple, list))
            else script_obj.down_revision
        )

        project_output_dir = self.shared_dir / project_name / "output"
        project_output_dir.mkdir(parents=True, exist_ok=True)

        if down_rev:
            logger.info(f"Incremental migration: {down_rev} -> {current_rev}")
            command.upgrade(cfg, down_rev)
            old_data = self._capture_all_metadata(db_url)

            command.upgrade(cfg, current_rev)
            new_data = self._capture_all_metadata(db_url)

            self._generate_and_save_diffs(
                old_data, new_data, project_output_dir, current_rev
            )
        else:
            logger.info(f"Base migration: {current_rev}")
            command.upgrade(cfg, current_rev)
            new_data = self._capture_all_metadata(db_url)

        self._save_all_metadata(new_data, project_output_dir, current_rev)
        return current_rev, down_rev

    def _generate_and_save_diffs(self, old_data, new_data, out_dir: Path, rev: str):
        diffs = {
            "diff": SchemaDiff(old_data["schema"], new_data["schema"]).compare(),
            "views_diff": SchemaDiff.compare_views(
                old_data["views"], new_data["views"]
            ),
            "functions_diff": SchemaDiff.compare_functions(
                old_data["functions"], new_data["functions"]
            ),
            "triggers_diff": SchemaDiff.compare_triggers(
                old_data["triggers"], new_data["triggers"]
            ),
        }
        for name, data in diffs.items():
            self._save_json(data, out_dir / f"{rev}_{name}.json")

    def _save_all_metadata(self, data: dict, out_dir: Path, rev: str) -> None:
        file_mappings = {
            "schema": f"{rev}_schema.json",
            "views": f"{rev}_views.json",
            "functions": f"{rev}_functions.json",
            "triggers": f"{rev}_triggers.json",
        }

        for key, filename in file_mappings.items():
            if key in data:
                file_path = out_dir / filename
                self._save_json(data[key], file_path)

    def _capture_all_metadata(self, db_url: str) -> dict:
        return {
            "schema": self._capture_schema(db_url),
            "views": self._capture_views(db_url),
            "functions": self._capture_functions(db_url),
            "triggers": self._capture_triggers(db_url),
        }

    def _capture_schema(self, db_url: str):
        engine = create_engine(db_url)
        inspector = inspect(engine)
        snapshot = {"tables": []}

        for table_name in inspector.get_table_names():
            columns = []
            for col in inspector.get_columns(table_name):
                columns.append(
                    {
                        "name": col["name"],
                        "type": str(col["type"]),
                        "nullable": col["nullable"],
                        "default": str(col["default"]) if col.get("default") else None,
                    }
                )
            snapshot["tables"].append(
                {
                    "name": table_name,
                    "columns": columns,
                    "primary_key": inspector.get_pk_constraint(table_name).get(
                        "constrained_columns", []
                    ),
                    "foreign_keys": [
                        {
                            "constrained_columns": fk["constrained_columns"],
                            "referred_table": fk["referred_table"],
                            "referred_columns": fk["referred_columns"],
                        }
                        for fk in inspector.get_foreign_keys(table_name)
                    ],
                }
            )
        return snapshot

    def _capture_views(self, db_url: str) -> dict:
        engine = create_engine(db_url)
        views = {"views": [], "materialized_views": []}
        with engine.connect() as conn:
            res = conn.execute(
                text("""
                SELECT table_name, view_definition
                FROM information_schema.views
                WHERE table_schema = 'public'
            """)
            )
            views["views"] = [{"name": row[0], "definition": row[1]} for row in res]

            res = conn.execute(
                text("""
                SELECT matviewname, definition
                FROM pg_matviews
                WHERE schemaname = 'public'
            """)
            )
            views["materialized_views"] = [
                {"name": row[0], "definition": row[1]} for row in res
            ]
        return views

    def _capture_functions(self, db_url: str) -> dict:
        engine = create_engine(db_url)
        with engine.connect() as conn:
            res = conn.execute(
                text("""
                SELECT proname, pg_get_functiondef(oid) as def, pg_get_function_identity_arguments(oid) as args
                FROM pg_proc
                WHERE pronamespace = 'public'::regnamespace
            """)
            )
            return {
                "functions": [
                    {"name": f"{row[0]}({row[2]})", "definition": row[1]} for row in res
                ]
            }

    def _capture_triggers(self, db_url: str) -> dict:
        engine = create_engine(db_url)
        with engine.connect() as conn:
            res = conn.execute(
                text("""
                SELECT tgname, relname, pg_get_triggerdef(pg_trigger.oid)
                FROM pg_trigger
                JOIN pg_class ON tgrelid = pg_class.oid
                WHERE relnamespace = 'public'::regnamespace AND tgisinternal = false
            """)
            )
            return {
                "triggers": [
                    {"name": row[0], "table": row[1], "definition": row[2]}
                    for row in res
                ]
            }
