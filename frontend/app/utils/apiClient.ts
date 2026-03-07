import { ofetch } from 'ofetch';

const config = useRuntimeConfig();

export const apiClient = ofetch.create({
  // For local develop
  baseURL: config.public.apiBaseUrl,

  // For Nginx
  // baseURL: '/api'

  async onRequest({ request, options }) {},

  async onResponseError({ request, response, options }) {
    console.error('[API Error]', response.status, response._data);
  },
});
