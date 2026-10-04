"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type CarouselImage = { src: string; alt: string };

type ImageListResponse = { images: CarouselImage[] };

export default function HomeCarousel() {
  const [images, setImages] = useState<CarouselImage[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/home-carousel-images", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load carousel images");
        return response.json() as Promise<ImageListResponse>;
      })
      .then((data) => {
        if (!cancelled) setImages(data.images);
      })
      .catch(() => {
        if (!cancelled) setImages([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(preference.matches);

    updatePreference();
    preference.addEventListener("change", updatePreference);
    return () => preference.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion || images.length < 2) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % images.length);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [images.length, paused, reducedMotion]);

  if (!images.length) return null;

  const showPrevious = () => {
    setActiveIndex((current) => (current - 1 + images.length) % images.length);
  };
  const showNext = () => {
    setActiveIndex((current) => (current + 1) % images.length);
  };

  return (
    <section className="home-carousel-shell" aria-label="Galerie d’images">
      <div
        className="home-carousel"
        role="region"
        aria-roledescription="carrousel"
        aria-label="Images de présentation"
      >
        <Image
          key={images[activeIndex].src}
          src={images[activeIndex].src}
          alt={images[activeIndex].alt || `Image ${activeIndex + 1} sur ${images.length}`}
          fill
          sizes="(max-width: 768px) 100vw, 1200px"
          priority={activeIndex === 0}
          className="home-carousel-image"
        />

        {images.length > 1 && (
          <>
            <button
              type="button"
              className="home-carousel-arrow home-carousel-arrow-previous"
              onClick={showPrevious}
              aria-label="Image précédente"
              title="Image précédente"
            >
              ‹
            </button>
            <button
              type="button"
              className="home-carousel-arrow home-carousel-arrow-next"
              onClick={showNext}
              aria-label="Image suivante"
              title="Image suivante"
            >
              ›
            </button>
            <div className="home-carousel-controls">
              <div className="home-carousel-indicators" aria-label="Choisir une image">
                {images.map((image, index) => (
                  <button
                    key={image.src}
                    type="button"
                    className={`home-carousel-indicator${index === activeIndex ? " is-active" : ""}`}
                    onClick={() => setActiveIndex(index)}
                    aria-label={`Afficher l’image ${index + 1}`}
                    aria-current={index === activeIndex ? "true" : undefined}
                  />
                ))}
              </div>
              <button
                type="button"
                className="home-carousel-pause"
                onClick={() => setPaused((current) => !current)}
                aria-label={paused ? "Reprendre le défilement" : "Mettre le défilement en pause"}
                title={paused ? "Reprendre" : "Pause"}
              >
                <span aria-hidden="true">{paused ? "▶" : "Ⅱ"}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
