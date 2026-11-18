# delivery_App

this repository is being test by the teacher to check it's CI/CD workflows.

## Règles de l'équipe (backend)

- **Chaque `.sort()` doit avoir son index dans le modèle.** En production, la base est Azure Cosmos DB : contrairement à MongoDB, elle refuse un tri sans index ("Erreur interne du serveur").
  Exemple : `Category.find().sort({ ordre: 1, nom: 1 })` → `categorySchema.index({ ordre: 1, nom: 1 });` dans `Category.js`.
