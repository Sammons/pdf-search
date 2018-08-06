# pdf-searcher

Traverses a folder and parses PDFs encountered. Use in the CLI. e.g.

```
pdf-search 'Registration certificate' --maxpages 4 -a 07/24 -b 08/01 -i
Searching C:\Users\bsamm\Google Drive\Scanned for files matching /Registration\s+certificate/gim with less than 4 pages, created (strictly) between "7/24/2018, 12:00:00 AM" and "8/1/2018, 12:00:00 AM"

> C:\Users\bsamm\Google Drive\Scanned\2018_07_25_07_47_00.pdf Matching Content REGISTRATION  CERTIFICATE
```

install with `npm install -g pdf-search`

This is a pretty rough implementation, thrown together on a Sunday afternoon after getting tired of digging through a folder of scanned PDFs when my scanner OCRs the documents. Why not use some custom third party search software? I want to get around to integrating with a node-opencv lib because now-adays opencv has tesseract built in. I should be able to scan images & pdf images and pull text to match against the regexp as well. That'd be a neat script right?

Licensed under MIT by Benjamin Sammons. Have fun.
