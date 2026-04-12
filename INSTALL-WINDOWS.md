# Installation sous Windows (dépannage)

Si `npm install` ou `npm run dev` échouent (erreurs `D:\next\dist\bin\next`, `napi-postinstall`, `ENOTEMPTY`), suivez ces étapes **dans l’ordre**.

## 1. Nettoyer complètement

Fermez Cursor/VS Code (pour libérer les fichiers), puis dans PowerShell :

```powershell
cd "D:\DEVLAB & DEVOPS\SEN TRAJET\APP WEB"

# Supprimer node_modules et package-lock.json
if (Test-Path node_modules) { Remove-Item -Recurse -Force node_modules }
if (Test-Path package-lock.json) { Remove-Item -Force package-lock.json }

# Vider le cache npm
npm cache clean --force
```

## 2. Réinstaller en ignorant les scripts postinstall

Le paquet `unrs-resolver` peut faire échouer l’install sur certains environnements. Lancez :

```powershell
npm install --ignore-scripts
```

Si ça termine sans erreur, passez à l’étape 3.

## 3. Lancer l’application

Les scripts du `package.json` utilisent déjà `npx`, ce qui force l’usage du binaire local :

```powershell
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

---

## Si le chemin du projet pose problème

Un chemin long ou avec des espaces peut gêner npm sous Windows. Deux options :

- **Option A** : Cloner/copier le projet dans un dossier plus court, par exemple `D:\sen-trajet`, puis refaire les étapes 1 à 3 dans ce dossier.
- **Option B** : Activer les chemins longs Windows (PowerShell en Admin) :
  ```powershell
  New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
  ```

## Versions utilisées

- **Next.js** : 14.2.35 (version avec correctifs de sécurité).
- Les scripts (dev/build/start) appellent `node ./node_modules/next/dist/bin/next` (évite D:\next).
