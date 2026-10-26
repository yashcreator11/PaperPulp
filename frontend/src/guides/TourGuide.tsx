import introJs from "intro.js";

interface TourGuideProps {
  steps: Array<{ element?: string; intro: string }>;
}

const TourGuide = ({ steps }: TourGuideProps) => {
  const startTour = () => {
    introJs()
      .setOptions({
        steps,
        showProgress: true,
        showBullets: true,
      })
      .start();
  };

  return (
    <button
      onClick={startTour}
      style={{
        padding: "6px 12px",
        background: "#2563eb",
        color: "white",
        borderRadius: "6px",
        cursor: "pointer",
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 9999,
      }}
    >
      Help
    </button>
  );
};

export default TourGuide;
