import React from 'react';

export default function Popup({gameOver, close}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black/50" onClick={close} />
      <div className="relative z-10 bg-base-100 text-base-content p-8 rounded-2xl shadow-2xl max-w-md w-full text-center h-50">
        {gameOver ? 
          <>
            <h1 className="text-4xl font-extrabold mb-4 text-center">
            Game Over!
            </h1>
            <span className="text-lg text-center block">Better luck next time!</span>
          </> : 
          <>
            <h1 className="text-4xl font-extrabold mb-4 text-center">
            You Win !
            </h1>
            <span className="text-lg text-center block">Can you solve the next one ?</span>
          </>}
        <button
          onClick={close}
          className="absolute top-2 right-4 text-base-content/60 hover:text-base-content font-extrabold text-3xl"
          aria-label="Close popup"
        >
          ×
        </button>
      </div>
    </div>
  );
}
