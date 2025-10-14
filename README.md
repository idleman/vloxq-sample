# Install
This project has no dependencies except Node.js, so as long as you have it installed, it should work just fine.

```bash
git clone vloxq-sample
cd vloxq-sample
npm install
npm test (optional)
```


# Start

## 1. Start the server that exposes the instruction set
```bash
cd packages/service-sample-example
node server.mjs
```
It exposes an instruction file: service-sample-example/instructions.mjs.
The listening address it prints out should be used as FETCH_URL for the main app as well, so remember it.

## 2. Start the main app
Below I start the Node.js server using [cross-env](https://www.npmjs.com/package/cross-env)
 to set the environment variable FETCH_URL, but any method that sets the variable should work.

```bash
cd packages/service-sample/bin
cross-env FETCH_URL=http://127.0.0.1:59885/ node sample.mjs
```

**IMPORTANT**. The FETCH_URL is the URL to the instruction set (provided in step 1).

To verify that everything works, visit: http://127.0.0.1:8080/reports


## 2.1 Reload
To reload the instruction set, send a POST request to: http://127.0.0.1:8080/renew


# Docker and Security

- **Docker**. A Dockerfile is provided, and it should work to build and run it.
- **Security**. In a real production system, the instruction set should be compiled into a WebAssembly module (or similar) to sandbox the code. The current new Function approach is, of course, a security risk.



# Structure
This repository is a monorepo and contains the following packages:

- **packages/core** - Contains general-purpose functionality.
- **packages/http** - Contains an HTTP router and adapters for the built-in Node.js server.
The main reason for this is to ensure WHATWG compatibility (Request/Response/fetch), making the code easier to migrate to a cloud provider.
- **packages/service** - A (micro)service template containing the basic functionality most services need.
It is wrapped in an Inversion of Control Container (IoC) to simplify test-driven development.
- **packages/service-sample** - The actual app that exposes the endpoints mentioned in the PDF file (exercise.pdf). It contains multiple submodules (instructions and reporter) to showcase how a real production system could be structured.
- **packages/service-sample-example** - A simple HTTP server that exposes the file instructions.mjs, which contains the instructions that service-sample will fetch when it starts up.
