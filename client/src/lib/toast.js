// A short message at the bottom of the screen ("Tracking size 10"), with
// an optional link, from anywhere. <Toaster /> (components/ui/Toaster.jsx,
// mounted once in App.jsx) shows it.
//   showToast({ message, tone: "success" | "error", link: { to, label } })
let listener = null;
let nextId = 1;

export const setToastListener = (fn) => {
  listener = fn;
};

export const showToast = (toast) => listener?.({ id: nextId++, tone: "success", ...toast });
