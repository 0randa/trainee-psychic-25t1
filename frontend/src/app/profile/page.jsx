"use client";
import { apiRequest } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import React, { useEffect } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import games from "../game/games_info.json";

export default function ProfilePage() {
  const [userDetails, setUserDetails] = useState([null, null, null]);
  const [gameID, setgameID] = useState(null);
  const [gameDetails, setGameDetails] = useState(null);
  const [gameScore, setGameScore] = useState(null);

  function toggleModal() {
    const dialogElement = document.getElementById("my_modal_3");
    if (dialogElement) {
      if (dialogElement.open) {
        dialogElement.close();
      } else {
        dialogElement.showModal();
      }
    }
  }

  useEffect(() => {
    async function getUserDetails() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", session.user.id)
          .single();

        setUserDetails({
          id: session.user.id,
          email: session.user.email,
          name: profile?.name,
        });
      } catch (error) {
        console.error("Failed to get status: ", error);
      }
    }

    getUserDetails();
  }, []);

  useEffect(() => {
    async function frequentlyPLayed() {
      try {
        const response = await apiRequest(
          "get",
          "/scores/user/most_played"
        );
        const { game_id, score } = response.data;
        setgameID(game_id);
        setGameScore(score);
      } catch (error) {
        console.error("Failed to get status: ", error);
      }
    }

    frequentlyPLayed();
  }, []);

  function GameInfoModal(props) {
    const navigate = useRouter();

    return (
      <>
        <dialog id="my_modal_3" className="modal">
          <div className="modal-box">
            <form method="dialog">
              <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
                ✕
              </button>
            </form>
            <h3 className="font-bold text-lg">Game Details</h3>
            <p className="py-4">{gameDetails?.description || "description"}</p>
            <button
              onClick={() => navigate.push(gameDetails.route)}
              className="btn btn-primary"
            >
              Play
            </button>
          </div>
        </dialog>
      </>
    );
  }

  useEffect(() => {
    async function getGameDetails() {
      const game = games.find((element) => element.id === gameID);
      // console.log("hey");
      // console.log(game);
      setGameDetails(game);
    }
    getGameDetails();
  }, [gameID]);

  function UserInfo() {
    return (
      <div className="hero-content text-center ">
        <div className="w-[500px]">
          <div className="flex w-full flex-col">
            <div className="card bg-base-300 rounded-box grid place-items-center p-3">
              <div className="avatar">
                <div className="w-24 rounded-full">
                  <img src="https://img.daisyui.com/images/profile/demo/yellingcat@192.webp" />
                </div>
              </div>
              <div>
                <p className="leading-7 mb-2 [&:not(:first-child)]:mt-6">
                  {userDetails?.name || "Loading..."}
                </p>
                <p className="text-sm text-zinc-700 leading-none">
                  {userDetails?.email || "Loading..."}
                </p>
              </div>
            </div>
            <div className="divider"></div>
            <div className="flex flex-col text-left card bg-base-300 rounded-box p-6 space-y-3">
              <div className="flex flex-row w-full">
                <div className="flex flex-col flex-[1] pr-2">
                  <div className="font-medium">Most played game:</div>
                  <div className="font-medium">Score:</div>
                </div>
                <div className="flex flex-col flex-[1.5] pl-2">
                  <div>
                    <a
                      onClick={toggleModal}
                      className="cursor-pointer hover:underline"
                    >
                      {gameDetails?.name || "Loading..."}
                    </a>
                  </div>
                  <div>{gameScore || "Loading... "}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TODO: find out the player's most played game.
  // make a call to the backend to get the player's most played game.
  // const mostPlayedGame = games[Math.floor(Math.random() * games.length)];
  return (
    <div
      className="hero min-h-screen"
      style={{
        backgroundImage: "url(/images/arcade.jpg)",
      }}
    >
      <UserInfo />
      <GameInfoModal />
    </div>
  );
}
