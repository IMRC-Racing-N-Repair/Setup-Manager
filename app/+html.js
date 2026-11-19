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
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  * {
    box-sizing: border-box;
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
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: globalCss }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
