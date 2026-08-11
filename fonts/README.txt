Desserts of Joy — self-hosted fonts
===================================

These .woff2 files are subsets of three open-source typefaces, cut down to
only the characters this menu actually renders. Nothing here is fetched from
the internet at page load; the site is entirely same-origin.

  caveat-700.woff2        Caveat Bold — the "Desserts of Joy" wordmark only.
                          Subsetted to the 10 letters of that phrase, which is
                          why it is 6 KB rather than 35 KB. This one is
                          preloaded from index.html.

  cormorant-400.woff2     Cormorant Garamond — section header bands, nav
  cormorant-600.woff2     pills, the location line and footer meta lines.

  ebgaramond-400.woff2    EB Garamond — body text, item names and prices.
  ebgaramond-400i.woff2   Italic — the tagline and the terracotta notes.

Licences
--------
All three families are licensed under the SIL Open Font Licence 1.1. The full
licence text for each is in this folder (OFL-*.txt) and must ship with the
site. Keep these files when you deploy.


Regenerating
------------
If the menu ever needs a character outside the subset — basic ASCII plus
₹ · – — ' ' " " … — the fonts must be rebuilt or that character will render
in a fallback face. The wordmark font is the tightest: changing the wordmark
text requires a rebuild.

Requires Python with fonttools:

    pip install "fonttools[woff]"
    python fonts/build-fonts.py

The script downloads the upstream variable fonts from the google/fonts
repository, pins each to the single weight the page uses, subsets it, writes
the .woff2 files here, and then verifies that every character the page
renders is present in the output. It prints "VERIFY: all required glyphs
present" on success.

Note that build-fonts.py and this README are only needed to REBUILD the
fonts. They are not needed to run or deploy the site; leaving them in the
uploaded folder is harmless.
