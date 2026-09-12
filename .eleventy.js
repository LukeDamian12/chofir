module.exports = function(eleventyConfig) {
  const platformThumbnails = require("./_data/platform-thumbnails.json");

  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("admin");
  eleventyConfig.addPassthroughCopy("_headers");

  eleventyConfig.addFilter("toJson", function(obj) {
    return JSON.stringify(obj);
  });

  eleventyConfig.addFilter("fechaCorta", function(date) {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d)) return "";

    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = d.getUTCFullYear();

    return `${dd}-${mm}-${yyyy}`;
  });

  eleventyConfig.addFilter("resolveThumb", function(data) {
    if (!data) return "/assets/thumbs/video.svg";

    if (data.thumbnail) return data.thumbnail;

    if (data.youtube) {
      const m = String(data.youtube).match(
        /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([A-Za-z0-9_-]{11})/i
      );

      if (m) {
        return `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg`;
      }
    }

    if (data.odysee && platformThumbnails[data.odysee]) {
      return platformThumbnails[data.odysee];
    }

    if (data.bitchute && platformThumbnails[data.bitchute]) {
      return platformThumbnails[data.bitchute];
    }

    if (data.odysee) {
      return "/assets/thumbs/odysee.svg";
    }

    if (data.bitchute) {
      return "/assets/thumbs/bitchute.svg";
    }

    if (data.categoria) {
      return "/assets/thumbs/recurso.svg";
    }

    return "/assets/thumbs/article.svg";
  });

  eleventyConfig.addFilter("youtubeId", function(url) {
    if (!url) return "";

    const match = String(url).match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([A-Za-z0-9_-]{11})/i
    );

    return match ? match[1] : "";
  });

  eleventyConfig.addFilter("youtubeThumbnail", function(url) {
    if (!url) return "";

    const match = String(url).match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([A-Za-z0-9_-]{11})/i
    );

    return match
      ? `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`
      : "";
  });

  eleventyConfig.addFilter(
    "platformThumbnail",
    function(url, fallbackType = "video") {
      if (!url) {
        return `/assets/thumbs/${fallbackType}.svg`;
      }

      if (platformThumbnails[url]) {
        return platformThumbnails[url];
      }

      const value = String(url).toLowerCase();

      if (value.includes("bitchute.com")) {
        return "/assets/thumbs/bitchute.svg";
      }

      if (value.includes("odysee.com")) {
        return "/assets/thumbs/odysee.svg";
      }

      return `/assets/thumbs/${fallbackType}.svg`;
    }
  );

  eleventyConfig.addFilter("youtubeEmbed", function(url) {
    if (!url) return "";

    const match = String(url).match(
      /(?:youtu\.be\/|youtube\.com.*(?:\?v=|\/embed\/|\/v\/|\/shorts\/))([A-Za-z0-9_-]{11})/i
    );

    const id = match ? match[1] : null;

    return id
      ? `https://www.youtube.com/embed/${id}`
      : url;
  });

  eleventyConfig.addFilter("bitchuteEmbed", function(url) {
    if (!url) return "";

    const match = String(url).match(
      /bitchute\.com\/video\/([A-Za-z0-9]+)/i
    );

    return match
      ? `https://www.bitchute.com/embed/${match[1]}/`
      : url;
  });

  eleventyConfig.addFilter("odyseeEmbed", function(url) {
    if (!url) return "";

    return String(url).includes("odysee.com/$/embed/")
      ? url
      : String(url).replace(
          "odysee.com/",
          "odysee.com/$/embed/"
        );
  });

  // ============================================================
  // COLECCIONES
  // ============================================================

  const sortedByDateDesc = (api, glob) =>
    api
      .getFilteredByGlob(glob)
      .sort((a, b) => {
        const ad = a.data.date
          ? new Date(a.data.date).getTime()
          : 0;

        const bd = b.data.date
          ? new Date(b.data.date).getTime()
          : 0;

        return bd - ad;
      });

  eleventyConfig.addCollection(
    "videos",
    api =>
      sortedByDateDesc(
        api,
        "content/videos/*.md"
      )
  );

  eleventyConfig.addCollection(
    "directos",
    api =>
      sortedByDateDesc(
        api,
        "content/directos/*.md"
      )
  );

  eleventyConfig.addCollection(
    "articulos",
    api =>
      sortedByDateDesc(
        api,
        "content/articulos/*.md"
      )
  );

  eleventyConfig.addCollection(
    "recursos",
    api =>
      sortedByDateDesc(
        api,
        "content/recursos/*.md"
      )
  );

  // Fecha simple para sitemap
  eleventyConfig.addFilter("toIsoDate", function(date) {
    if (!date) return "";

    return new Date(date)
      .toISOString()
      .split("T")[0];
  });

  // ============================================================
  // SISTEMA DE TAGS NORMALIZADO
  // ============================================================

  /*
    Convierte:

    "Sionismo"
    "sionismo"
    "SIONISMO"
    " Sionismo "
    "Siónismo"

    en:

    "sionismo"

    Esto impide que Eleventy intente crear dos páginas
    distintas que terminen usando la misma URL.
  */

  const tagSlug = value =>
    String(value || "")
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  // Disponible también dentro de Nunjucks
  eleventyConfig.addFilter(
    "tagSlug",
    tagSlug
  );

  /*
    Sirve para comprobar si un contenido contiene un tag
    ignorando mayúsculas, minúsculas, tildes y espacios.
  */

  eleventyConfig.addFilter(
    "hasTag",
    function(tags, wantedTag) {
      if (
        !Array.isArray(tags) ||
        !wantedTag
      ) {
        return false;
      }

      const wantedSlug =
        tagSlug(wantedTag);

      return tags.some(
        tag =>
          tagSlug(tag) ===
          wantedSlug
      );
    }
  );

  /*
    Crea la lista global de tags.

    En lugar de guardar directamente todos los textos,
    los agrupa por su slug normalizado.

    Ejemplo:

    "Sionismo"
    "sionismo"

    producen una sola página:

    /tags/sionismo/
  */

  eleventyConfig.addCollection(
    "tagList",
    function(api) {
      const excluidos =
        new Set([
          "videos",
          "directos",
          "articulos",
          "recursos",
          "all",
          "nav"
        ]);

      const tagsPorSlug =
        new Map();

      api.getAll().forEach(
        item => {
          if (
            !Array.isArray(
              item.data.tags
            )
          ) {
            return;
          }

          item.data.tags.forEach(
            rawTag => {
              if (
                typeof rawTag !==
                "string"
              ) {
                return;
              }

              /*
                Elimina espacios
                accidentales.

                Ejemplo:

                "Historia   de España"

                pasa a ser:

                "Historia de España"
              */

              const tag =
                rawTag
                  .trim()
                  .replace(
                    /\s+/g,
                    " "
                  );

              if (!tag) return;

              const slug =
                tagSlug(tag);

              if (!slug) return;

              // No convertir tags internos
              // de Eleventy en páginas públicas.
              if (
                excluidos.has(slug)
              ) {
                return;
              }

              /*
                Si ya existe un tag
                con ese mismo slug,
                no se agrega nuevamente.
              */

              if (
                !tagsPorSlug.has(
                  slug
                )
              ) {
                tagsPorSlug.set(
                  slug,
                  tag
                );
              }
            }
          );
        }
      );

      /*
        Orden alfabético en español.
      */

      return [
        ...tagsPorSlug.values()
      ].sort((a, b) =>
        a.localeCompare(
          b,
          "es",
          {
            sensitivity: "base"
          }
        )
      );
    }
  );

  return {
    dir: {
      input: ".",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },

    templateFormats: [
      "md",
      "njk",
      "html"
    ]
  };
};