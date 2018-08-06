declare module 'pdf-parse' {
  const parser: (contents: Buffer) => Promise<{
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    version: string;
    text: string;
  }>
  export = parser;
}
