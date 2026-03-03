import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type NewsItem = {
  title: string;
  description: string;
  url: string;
  urlToImage?: string;
  source: { name: string };
  publishedAt: string;
};

const Home = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://newsapi.org/v2/everything?q=fraud&language=en&sortBy=publishedAt&pageSize=12&apiKey=${
            import.meta.env.VITE_NEWS_API_KEY
          }`
        );
        const data = await response.json();
        if (data.articles) {
          setNews(data.articles);
        }
      } catch (error) {
        console.error("Error fetching news:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-400">Fraud News Hub</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
          Latest Fraud-Related News
        </h2>

        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <Card
                  key={index}
                  className="bg-slate-800 border-slate-700 rounded-2xl overflow-hidden"
                >
                  <Skeleton className="h-48 w-full" />
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <motion.div
              layout
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {news.map((item, index) => (
                <motion.div
                  key={index}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="bg-slate-800 border-slate-700 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 rounded-2xl overflow-hidden group">
                    {item.urlToImage && (
                      <div className="overflow-hidden">
                        <img
                          src={item.urlToImage}
                          alt={item.title}
                          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-blue-300 group-hover:text-blue-400 transition-colors">
                        {item.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-300 mb-4 line-clamp-3">
                        {item.description || "No description available."}
                      </p>
                      <div className="flex justify-between items-center text-sm text-slate-400">
                        <span>{item.source.name}</span>
                        <time>
                          {new Date(item.publishedAt).toLocaleTimeString()}
                        </time>
                      </div>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline mt-2 block"
                      >
                        Read More →
                      </a>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Home;
