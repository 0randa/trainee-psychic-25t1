import { apiRequest } from "@/lib/api";

export async function uploadGameScore(score, game_id) {
  if (score > 0) {
    try {
      await apiRequest("post", "/scores/upload", { game_id, score });
    } catch (error) {
      console.error("Failed to retrieve scores:", error);
    }
  }
}
