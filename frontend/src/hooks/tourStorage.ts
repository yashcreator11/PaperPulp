// 📌 src/utils/tourStorage.ts

export const PAGE_TOUR_KEY = "page_tour_completed";
export const BACKEND_TOUR_KEY = "backend_tour_done";

// ----- Load page tour state -----
export const getPageTourState = () => {
  try {
    return JSON.parse(localStorage.getItem(PAGE_TOUR_KEY) || "{}");
  } catch {
    return {};
  }
};

// ----- Mark a specific page as completed -----
export const markPageCompleted = (page: string) => {
  const state = getPageTourState();
  state[page] = true;
  localStorage.setItem(PAGE_TOUR_KEY, JSON.stringify(state));
};

// ----- Mark backend as tour done -----
export const setBackendTourDone = () => {
  localStorage.setItem(BACKEND_TOUR_KEY, "true");
};

// ----- Get backend tour status from localStorage -----
export const getBackendTourStatus = () => {
  return localStorage.getItem(BACKEND_TOUR_KEY);
};

// ----- Clear all tour data (use on logout) -----
export const clearTourData = () => {
  localStorage.removeItem(PAGE_TOUR_KEY);
  localStorage.removeItem(BACKEND_TOUR_KEY);
};
