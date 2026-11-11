import { createContext, useContext } from "react";

// True inside a picture of the app drawn with sample data (the landing
// page's dashboard preview). Links there are plain text and headings
// aren't the page's own, so search engines and screen readers never
// follow a picture into login-only pages.
export const PreviewMode = createContext(false);
export const usePreviewMode = () => useContext(PreviewMode);
