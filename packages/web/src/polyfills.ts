import { Buffer } from 'buffer';
(globalThis as unknown as { Buffer: typeof Buffer }).Buffer ??= Buffer;
(globalThis as unknown as { global: typeof globalThis }).global ??= globalThis;
(globalThis as unknown as { process: {env:Record<string,string>} }).process ??= {env:{}};
