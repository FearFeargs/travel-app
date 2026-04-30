import { Loader } from '@googlemaps/js-api-loader'

let loader = null

export function getGoogleMapsLoader() {
  if (!loader) {
    loader = new Loader({
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY || '',
      version: 'weekly',
      libraries: ['places'],
    })
  }
  return loader
}
