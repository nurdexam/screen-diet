import { auth } from "../../auth.js";

const handler = (request: Request) => auth.handler(request);

export const GET = handler;
export const POST = handler;
export const OPTIONS = handler;
