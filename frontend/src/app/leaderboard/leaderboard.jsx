"use client";
import { apiRequest } from "@/lib/api";
import { useState } from "react";

export default function LeaderBoard() {
  const [scores, setScores] = useState([]);

  function organise_data() {
    getScores();

    let topTen = JSON.parse(JSON.stringify(scores))
      .sort((a, b) => b.score - a.score)
      .slice(0, 9);

    return [...topTen].map((item, index) => (
      <tr key={item.user_id}>
        <th>{index + 1}</th>
        <td>{item.username}</td>
        <td>{item.score}</td>
      </tr>
    ));
  }

  async function getScores() {
    try {
      const response = await apiRequest("get", "/scores/get");
      setScores(response.data.scores);
    } catch (error) {
      console.error("Failed to upload score: ", error);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="table">
        {/* head */}
        <thead>
          <tr>
            <th>Rank</th>
            <th>Name</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {/* row 1 */}
          {organise_data()}
        </tbody>
      </table>
    </div>
  );
}
