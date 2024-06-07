const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // Modul zum Generieren von UUIDs
const app = express();

const port = process.env.PORT || 3000;
const apiToken = process.env.TOKEN || 'default_token';

console.log(`API Token: ${apiToken}`);
console.log(`Server wird auf Port ${port} gestartet`);

app.use(express.json());

// =========================================== functions ===========================================

// Middleware zur Authentifizierung
const authenticate = (req, res, next) => {

  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token === apiToken) {
      return next();
    }
  }
  
  // Token fehlt oder ist ungültig
  res.status(403).send('Forbidden: Ungültiger oder fehlender Token');
};

// Helper-Funktion zum Lesen und Schreiben der JSON-Datei
const readEntries = () => {
  try {
      const data = fs.readFileSync('data.json', 'utf8');
      return JSON.parse(data);
  } catch (err) {
      return {};
  }
};

const writeEntries = (entries) => { 
  fs.writeFileSync('data.json', JSON.stringify(entries, null, 2), 'utf8');
};

const createSlug = () => { return Math.random().toString(36).substr(2, 8); };


// async function createRedirects() {
//   const entries = readEntries();
//   if(entries) {

//     Object.keys(entries).forEach(key => {
//       app.get(`/:${key}`, (req, res) => {
//         res.redirect(entries[key])
//       });
//     });
//   }
// }
// createRedirects();

// =========================================== API ===========================================  

// Route zum Abrufen aller Einträge aus der JSON-Datei (mit Authentifizierung)
app.get('/entries', authenticate, (req, res) => {

  console.log("get: '/entries' ID: 001");
  const filePath = path.join(__dirname, 'data.json');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Fehler beim Lesen der Datei:', err);
            return res.status(500).send('Fehler beim Lesen der Datei');
        }
        res.header("Content-Type", "application/json");
        res.send(data);
    });
});


// Route zum Umleiten basierend auf der Slug
app.get('/:slug', (req, res) => {

  console.log("get: '/:slug' ID: 003");
  const { slug } = req.params;
  const filePath = path.join(__dirname, 'data.json');

  fs.readFile(filePath, 'utf8', (err, data) => {

    if (err) {
      console.error('Fehler beim Lesen der Datei:', err);
      return res.status(500).send('Fehler beim Lesen der Datei');
    }

    const jsonData = JSON.parse(data);
    const entry = jsonData.find(entry => entry.slug == slug);
   
    if (entry) {
        const targetURL = entry.rwu;
        console.log("targetURL: " + targetURL);
        res.redirect(301, targetURL);
    } else {
      console.log("Eintrag nicht gefunden");
      res.status(404).send('Eintrag nicht gefunden');
    }
  });
});

// // Endpunkt zum Hinzufügen einer neuen URL
// app.post('/entry', authenticate, (req, res) => {
//   const { url, slug } = req.body;

//   if (!url || typeof url !== 'string' || !url.match(/^https?:\/\/[^\s$.?#].[^\s]*$/)) {
//       return res.status(400).send('Invalid URL');
//   }

//   const entries = readEntries();
  
//   if (slug && entries[slug]) {
//     return res.status(400).send('Slug already exists');
//   }
  
//   const newSlug = slug || createSlug();
//   entries[newSlug] = url;
//   writeEntries(entries);

//   res.status(201).json({ message: 'Entry added', slug: newSlug, url: url });
// });


// // Endpunkt zum Löschen eines Eintrags
// app.delete('/entry/:slug', authenticate, (req, res) => {
//   const entries = readEntries();
//   const slug = req.params.slug;
//   if (entries[slug]) {
//       delete entries[slug];
//       writeEntries(entries);
//       res.json({ message: 'Entry deleted' });
//   } else {
//       res.status(404).send('Slug not found');
//   }
// });


// Route zum Löschen eines Eintrags anhand der Slug
app.delete('/entry/:slug', (req, res) => {
  
  const { slug } = req.params;
    const filePath = path.join(__dirname, 'data.json');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Fehler beim Lesen der Datei:', err);
            return res.status(500).send('Fehler beim Lesen der Datei');
        }
        
        let entries = JSON.parse(data);
        const index = entries.findIndex(entry => entry.slug === slug);
        if (index !== -1) {
            entries.splice(index, 1);

            // Aktualisierte Daten in die Datei schreiben
            fs.writeFile(filePath, JSON.stringify(entries, null, 2), (err) => {
                if (err) {
                    console.error('Fehler beim Schreiben der Datei:', err);
                    return res.status(500).send('Fehler beim Schreiben der Datei');
                }
                res.send('Eintrag erfolgreich entfernt');
            });
        } else {
            res.status(404).send('Eintrag nicht gefunden');
        }
    });
});

// Route zum Hinzufügen eines Eintrags
app.post('/entry', (req, res) => {
    let { slug, url } = req.body;

    if (!slug) {
      // Wenn keine Slug mitgegeben wurde, generiere eine zufällige UUID
      slug = uuidv4();
    }

    const entry = {
        slug: slug,
        url: url
    };

    const filePath = path.join(__dirname, 'data.json');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err && err.code !== 'ENOENT') {
            console.error('Fehler beim Lesen der Datei:', err);
            return res.status(500).send('Fehler beim Lesen der Datei');
        }
        let entries = [];
        if (!err) {
            entries = JSON.parse(data);
        }
        entries.push(entry);

        // Aktualisierte Daten in die Datei schreiben
        fs.writeFile(filePath, JSON.stringify(entries, null, 2), (err) => {
            if (err) {
                console.error('Fehler beim Schreiben der Datei:', err);
                return res.status(500).send('Fehler beim Schreiben der Datei');
            }
            res.send('Eintrag erfolgreich hinzugefügt');
        });
    });
});

// Standardroute
app.get('/', (req, res) => {

  console.log("get: '/' ID: 002");
  res.send('Hallo Welt!');
});

// Server starten
app.listen(port, () => {
    console.log(`Server läuft auf Port ${port}`);
});




