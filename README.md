

  ## Running the code

  Run `npm i` to install the dependencies.

  Start the TCP relay (forwards the browser WebSocket to the remote pure TCP host):

  ```bash
  npm run relay
  ```

  The relay listens on `ws://localhost:6003` by default and forwards to `tcp://179.60.177.14:6002`. Override the defaults with the `RELAY_PORT`, `TARGET_HOST`, and `TARGET_PORT` environment variables if needed.

  In a second terminal, start the Vite development server:

  ```bash
  npm run dev
  ```

  The client reads `VITE_TCP_RELAY_URL` (default `ws://localhost:6003`) to know which relay endpoint to use.
  
