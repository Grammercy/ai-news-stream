import { getNews } from "./news";
import Stream from "./stream";
export const dynamic = "force-dynamic";
export default async function Home() { return <Stream initial={await getNews()} />; }
