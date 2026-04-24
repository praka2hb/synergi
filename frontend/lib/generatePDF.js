export function generatePDF(content) {
  const safeContent = typeof content === "string" ? content : String(content || "");
  
  // Create a blob from the content
  const blob = new Blob([safeContent], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  
  // Create a temporary link and trigger download
  const link = document.createElement("a");
  link.href = url;
  link.download = "document.txt";
  document.body.appendChild(link);
  link.click();
  
  // Clean up
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
