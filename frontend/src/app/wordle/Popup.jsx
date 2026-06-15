export default function Popup({ display, close, winState, correctWord }) {
  if (!display) return null;

  const capitalizedWord =
    correctWord.charAt(0).toUpperCase() + correctWord.slice(1);

  const content =
    winState === "win" ? (
      <>
        <h1 className="text-4xl font-extrabold mb-4 text-center">
          {capitalizedWord}
        </h1>
        <span className="text-lg text-center block">
          Great job solving the puzzle!
        </span>
      </>
    ) : winState === "lose" ? (
      <>
        <h1 className="text-4xl font-extrabold mb-4 text-center">
          {capitalizedWord}
        </h1>
        <span className="text-lg text-center block">
          Better luck next time!
        </span>
      </>
    ) : winState === "play" ? (
      <>
        <h1 className="text-4xl font-extrabold mb-4 text-center">New Round</h1>
        <span className="text-lg text-center block">
          Can you solve the next one ?
        </span>
      </>
    ) : (
      <span className="text-center block">Something went wrong.</span>
    );

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black/50" onClick={close} />
      <div className="relative z-10 bg-base-100 text-base-content p-8 rounded-2xl shadow-2xl max-w-md w-full text-center h-50">
        {content}
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
