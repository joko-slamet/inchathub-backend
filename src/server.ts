import { app } from "./app";
import { env } from "./config/env";
import { startArticleScheduler } from "./scheduler/article-scheduler";

app.listen(env.port, () => {
  console.log(`Server listening on http://localhost:${env.port}`);
});

startArticleScheduler();
