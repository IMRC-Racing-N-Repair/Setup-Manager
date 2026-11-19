import React from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';

const globalCss = `
  html, body, #root {
    width: 100%;
    min-height: 100%;
    margin: 0;
    background: #070B13;
  }

  body {
    color: #F4F7FB;
    overflow-x: hidden;
    color-scheme: dark;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  * {
    box-sizing: border-box;
  }

  a:focus-visible, button:focus-visible, [role="button"]:focus-visible,
  input:focus-visible, textarea:focus-visible, select:focus-visible {
    outline: 2px solid #82BAFF;
    outline-offset: 2px;
  }

  nav a:hover {
    background-color: #182A43;
  }

  button, input, textarea, select {
    font: inherit;
  }
`;

export default function Root({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#070B13" />
        <meta name="description" content="IMRC Setup Manager for RC racers." />
        <title>IMRC Setup Manager</title>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/imrc-icon-192.png" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: globalCss }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
