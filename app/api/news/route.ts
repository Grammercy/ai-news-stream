import { getNews } from "../../news";
export async function GET() {
  return Response.json(await getNews(), {headers: {"Cache-Control": "no-store"}});
}
