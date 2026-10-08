import { auth } from "../../auth.js";

export const fetch = (request: Request) => auth.handler(request);
export default { fetch };
