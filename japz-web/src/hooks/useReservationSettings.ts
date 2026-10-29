import { useEffect, useState } from "react";
import {
  errorMessage,
  reservationAPI,
  type ReservationSettings,
} from "../services/reservations";

export function useReservationSettings() {
  const [settings, setSettings] = useState<ReservationSettings | null>(null);
  const [error, setError] = useState("");
  const [revision, retry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    reservationAPI
      .settings(controller.signal)
      .then((response) => {
        setSettings(response.data);
        setError("");
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(errorMessage(error));
      });
    return () => controller.abort();
  }, [revision]);
  return {
    settings,
    setSettings,
    error,
    retry: () => retry((value) => value + 1),
  };
}
