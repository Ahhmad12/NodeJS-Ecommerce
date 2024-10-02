const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit number between 100000 and 999999
};

const generateUniqueHexString = () => {
  const uniqueString = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }
  );

  return uniqueString;
};

const generateSlug = (name) => {
  return name
    .toLowerCase() // Convert to lowercase
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/[^\w\-]+/g, "") // Remove all non-word characters
    .replace(/--+/g, "-") // Replace multiple hyphens with a single hyphen
    .trim(); // Trim whitespace from both ends
};

export { generateOTP, generateUniqueHexString, generateSlug };
