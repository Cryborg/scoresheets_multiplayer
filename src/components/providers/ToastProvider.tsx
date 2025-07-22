'use client';

import { Toaster } from 'react-hot-toast';

/**
 * Global toast provider component
 * Should be included at the root level of the app
 */
export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      containerClassName=""
      containerStyle={{}}
      toastOptions={{
        // Define default options for all toasts
        className: '',
        duration: 3000,
        style: {
          background: '#363636',
          color: '#fff',
        },

        // Default options for specific toast types
        success: {
          duration: 3000,
          style: {
            background: 'rgb(34 197 94)',
            color: 'white',
          },
          iconTheme: {
            primary: 'white',
            secondary: 'rgb(34 197 94)',
          },
        },

        error: {
          duration: 4000,
          style: {
            background: 'rgb(239 68 68)',
            color: 'white',
          },
          iconTheme: {
            primary: 'white',
            secondary: 'rgb(239 68 68)',
          },
        },

        loading: {
          style: {
            background: 'rgb(59 130 246)',
            color: 'white',
          },
        },
      }}
    />
  );
}