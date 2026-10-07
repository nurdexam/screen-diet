import { auth } from "../../auth";
import { toVercelHandler } from "../../server/vercel-handler";

export const fetch = (request: Request) => auth.handler(request);
export default toVercelHandler(fetch);
