/**
 * 【要点】本物のAzureのふりをして、決まった返事だけを返すテスト用サーバー。課金0円。 (X-01/X-02)
 *  - 音声データは読み捨て、「（モック）n番目の結果」を返す → 結合順序の確認に使える
 *  - FAIL_RATE=0.2 なら2割の確率で429を返す → 再試行とエラー処理の確認に使える
 *  - createMock() を返すだけの形にしてあるので、テストからも直接起動できる（ポート0=空きポート）
 *  - ★CORSを全許可にしているため、モックで通っても本物のAzureで通る保証はない。必ず実機で確認する。
 */
import http from "node:http";
import { pathToFileURL } from "node:url";

export function createMock({ failRate = 0, delayMs = 300 } = {}) {
  const calls = [];
  const server = http.createServer((req, res) => {
    // 注意: CORS全許可なので、本物のAzureのCORS問題は隠れる
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
    let bytes = 0;
    req.on("data", (d) => (bytes += d.length));
    req.on("end", () => {
      setTimeout(() => {
        if (Math.random() < failRate) { res.writeHead(429); return res.end("{}"); }
        calls.push(bytes);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ combinedPhrases: [{ text: `（モック）${calls.length}番目の結果` }], phrases: [] }));
      }, delayMs);
    });
  });
  return { server, calls };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server } = createMock({ failRate: Number(process.env.FAIL_RATE || 0) });
  server.listen(8787, "0.0.0.0", () => console.log("mock: http://localhost:8787"));
}
