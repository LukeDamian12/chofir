module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("admin");

  // Convierte un array/objeto en texto JSON, para pasarle datos al JavaScript del sitio
  eleventyConfig.addFilter("toJson", function(obj) {
    return JSON.stringify(obj);
  });

  // Convierte un link normal de YouTube en un link de reproductor embebido
  eleventyConfig.addFilter("youtubeEmbed", function(url) {
    if (!url) return "";
    const match = url.match(/(?:youtu\.be\/|youtube\.com.*(?:\?v=|\/embed\/|\/v\/|\/shorts\/))([A-Za-z0-9_-]{11})/);
    const id = match ? match[1] : null;
    return id ? `https://www.youtube.com/embed/${id}` : url;
  });

  // Convierte un link normal de BitChute en un link de reproductor embebido
  eleventyConfig.addFilter("bitchuteEmbed", function(url) {
    if (!url) return "";
    const match = url.match(/bitchute\.com\/video\/([A-Za-z0-9]+)/);
    const id = match ? match[1] : null;
    return id ? `https://www.bitchute.com/embed/${id}/` : url;
  });

  // Convierte un link normal de Odysee en un link de reproductor embebido
  eleventyConfig.addFilter("odyseeEmbed", function(url) {
    if (!url) return "";
    return url.replace("odysee.com/", "odysee.com/$/embed/");
  });

  return {
    dir: {
      input: ".",
      output: "_site"
    }
  };
};
