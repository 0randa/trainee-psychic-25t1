"use client";

import { useEffect, useState } from "react";
import L from "leaflet";

import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrlfromLeaflet from "leaflet/dist/images/marker-icon.png";
import shadowUrlfromLeaflet from "leaflet/dist/images/marker-shadow.png";
import { uploadGameScore } from "../helpers";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";

const GAME_ID = 3;

export default function Quiz({ locations }) {
  const unswCoordinates = [-33.9173, 151.2313];

  const [selectedPos, setSelectedPos] = useState(null);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [UNSWLocations, setUNSWLocations] = useState(locations);

  const [locationIndex, setLocationIndex] = useState(0);
  const [score, setScore] = useState(0);

  function MapEvents() {
    if (answerRevealed) return;
    useMapEvents({
      click(e) {
        setSelectedPos(e.latlng);
      },
    });
    return null;
  }

  useEffect(() => {
    delete L.Icon.Default.prototype._getIconUrl;

    L.Icon.Default.mergeOptions({
      iconRetinaUrl: iconRetinaUrl.src,
      iconUrl: iconUrlfromLeaflet.src,
      shadowUrl: shadowUrlfromLeaflet.src,
    });
  }, []);

  if (!Array.isArray(locations)) {
    console.warn(
      "Quiz component: 'locations' prop is not an array or is undefined."
    );
    locations = [];
  }

  const startNextRound = () => {
    setLocationIndex((prevIndex) => prevIndex + 1);
    setAnswerRevealed(false);
    setSelectedPos(null);
  };

  const lockIn = () => {
    // locks in the player marker and compare it with the actual marker.
    // const [playerLat, playerLong] = selectedPos;

    const [answerLat, answerLong] = locations[locationIndex].coords;
    // got this from https://www.geeksforgeeks.org/haversine-formula-to-find-distance-between-two-points-on-a-sphere/
    function haversine(lat1, lon1, lat2, lon2) {
      // distance between latitudes
      // and longitudes
      let dLat = ((lat2 - lat1) * Math.PI) / 180.0;
      let dLon = ((lon2 - lon1) * Math.PI) / 180.0;

      // convert to radiansa
      lat1 = (lat1 * Math.PI) / 180.0;
      lat2 = (lat2 * Math.PI) / 180.0;

      // apply formulae
      let a =
        Math.pow(Math.sin(dLat / 2), 2) +
        Math.pow(Math.sin(dLon / 2), 2) * Math.cos(lat1) * Math.cos(lat2);
      let rad = 6371;
      let c = 2 * Math.asin(Math.sqrt(a));
      return rad * c;
    }

    const distance_metres =
      1000 * haversine(answerLat, answerLong, selectedPos.lat, selectedPos.lng);

    if (distance_metres <= 50) {
      console.log("yay!");
      setScore((prevScore) => prevScore + 1);
    }

    // set selected pos to null.
    setAnswerRevealed(true);
  };

  const playAgain = () => {
    uploadGameScore(score, GAME_ID);
    const shuffle = (array) => {
      let currentIndex = array.length;

      // While there remain elements to shuffle...
      while (currentIndex != 0) {
        // Pick a remaining element...
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
          array[randomIndex],
          array[currentIndex],
        ];
      }

      return array;
    };

    const newArray = shuffle(UNSWLocations);

    setUNSWLocations(newArray);
    setLocationIndex(0);
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <MapContainer
        center={unswCoordinates}
        zoom={16}
        minZoom={16}
        maxZoom={18}
        zoomDelta={0.2}
        style={{ height: "600px", width: "800px" }}
      >
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* for debugging */}
        {/* {locations.map(location => (
          <Marker
            key={location.name}
            position={location.coords}
          >
            <Popup>
              <div>
                <h2>{"Name: " + location.name}</h2>
                <p>Coords: {location.coords[0]}, {location.coords[1]}</p>
              </div>
            </Popup>
          </Marker>
        ))} */}

        {answerRevealed && (
          <Marker
            key={UNSWLocations[locationIndex].name}
            position={UNSWLocations[locationIndex].coords}
          >
            <Popup>
              <div>
                <h2>{"Name: " + UNSWLocations[locationIndex].name}</h2>
                <p>Coords: {UNSWLocations[locationIndex].coords}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* this is where the player clicks. */}
        {selectedPos && <Marker position={selectedPos} />}
        <MapEvents />
      </MapContainer>
      <div className="divider divider-horizontal"></div>
      <div className="flex flex-col">
        <div className="mb-4">
          {UNSWLocations && UNSWLocations[locationIndex] ? (
            <img
              className="w-[800px] h-[500px] object-cover mx-auto"
              src={UNSWLocations[locationIndex].img}
              alt={`Location ${locationIndex + 1}`}
            />
          ) : (
            <div className="w-[400px] h-[300px] flex items-center justify-center bg-gray-200 text-gray-500 mx-auto">
              <p>END OF QUIZ</p>
              <button onClick={playAgain} className="btn btn-primary">
                PLAY AGAIN
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-col items-center mx-auto mt-4">
          {selectedPos &&
            !answerRevealed &&
            UNSWLocations &&
            UNSWLocations.length > 0 && (
              <button onClick={lockIn} className="btn btn-primary w-1/2 mb-5">
                Lock In
              </button>
            )}
          {answerRevealed && (
            <button
              onClick={startNextRound}
              className="btn btn-secondary w-full mb-5"
            >
              Start next round
            </button>
          )}
          {/* TODO: IMPLEMENT HIGH SCORE */}
          <p>Score: {score} | High Score: 0</p>
        </div>
      </div>
    </div>
  );
}
