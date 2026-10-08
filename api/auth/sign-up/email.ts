import { auth } from "../../../auth.js";

const handler = (request: Request) => auth.handler(request);

export const POST = handler;
export const fetch = handler;
export default { fetch: handler };
