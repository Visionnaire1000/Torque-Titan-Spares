import { useEffect, useState } from "react";

const getDevice = (width) => {
  if (width < 640) return "📱 Mobile";
  if (width < 768) return "📟 Large Mobile";
  if (width < 1024) return "📱 Tablet";
  if (width < 1280) return "💻 Laptop";
  return "🖥️ Desktop";
};

const ResponsiveDebug = () => {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        bottom: "10px",
        right: "10px",
        zIndex: 99999,
        background: "rgba(0,0,0,0.75)",
        color: "white",
        padding: "10px 12px",
        borderRadius: "10px",
        fontSize: "13px",
        fontFamily: "monospace",
        pointerEvents: "none",
      }}
    >
      <div>Width: {width}px</div>
      <div>Mode: {getDevice(width)}</div>
    </div>
  );
};

export default ResponsiveDebug;