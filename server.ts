import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { buildProjectZipBuffer } from './src/utils/zipBuilder';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  // Endpoint to download the complete Wisport project as a clean .zip for GitHub & Codemagic TestFlight
  app.get('/api/export/project-zip', (_req, res) => {
    try {
      const zipBuffer = buildProjectZipBuffer(process.cwd());
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="wisport-ios-testflight-pack.zip"'
      );
      res.setHeader('Content-Length', String(zipBuffer.length));
      res.send(zipBuffer);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erreur lors de la création du ZIP.';
      res.status(500).json({ error: msg });
    }
  });

  const getGenAIClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return null;
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  // Biomechanical AI Coach Chat Endpoint
  app.post('/api/coach/analyze', async (req, res) => {
    try {
      const { prompt, telemetryContext } = req.body;
      if (!prompt || typeof prompt !== 'string') {
        res.status(400).json({ error: 'Une question ou instruction valide est requise.' });
        return;
      }

      const ai = getGenAIClient();
      if (!ai) {
        res.status(503).json({
          error:
            'Clé API Gemini non configurée. Veuillez vérifier le panneau Settings > Secrets dans AI Studio.',
        });
        return;
      }

      const systemInstruction = `Tu es Wisport AI, un ingénieur biomécanique et préparateur physique d'élite spécialisé en hypertrophie, force maximale et régulation du système nerveux central (CNS).
Réponds toujours en français avec un ton précis, scientifique, direct et actionnable.
Ne parle JAMAIS de nutrition ou de calories (le module nutrition est désactivé). Concentre-toi exclusivement sur la biomécanique, la surcharge progressive, la gestion du RIR/RPE, le volume effectif (MEV/MAV/MRV), la récupération nerveuse et les ajustements d'exercices.
Utilise les données télémétriques réelles de l'athlète fournies dans le contexte (score CNS, fatigue par muscle, exercices en cours, charges et 1RM estimés) pour donner des recommandations chiffrées précises (ex: ajustement en kg, changement de RIR, substitution d'exercice).
Garde ta réponse structurée en 3 points courts maximum.`;

      const fullPrompt = `CONTEXTE TÉLÉMÉTRIQUE ACTUEL DE L'ATHLÈTE :
${JSON.stringify(telemetryContext, null, 2)}

QUESTION DE L'ATHLÈTE :
${prompt}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: fullPrompt,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      res.json({
        reply: response.text || 'Analyse biomécanique complétée.',
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Erreur interne du serveur Gemini.';
      console.error('Gemini Coach Error:', errMsg);
      res.status(500).json({
        error: `Erreur lors de l'analyse biomécanique : ${errMsg}`,
      });
    }
  });

  // Dynamic Workout Adaptation Endpoint (returns structured JSON workout adjustment)
  app.post('/api/coach/adapt-program', async (req, res) => {
    try {
      const { reason, telemetryContext } = req.body;
      const ai = getGenAIClient();
      if (!ai) {
        res.status(503).json({
          error:
            'Clé API Gemini non configurée. Veuillez vérifier le panneau Settings > Secrets dans AI Studio.',
        });
        return;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `L'athlète demande une adaptation immédiate de sa séance actuelle pour la raison suivante : "${reason}".
Voici ses données télémétriques et sa séance actuelle :
${JSON.stringify(telemetryContext, null, 2)}

Propose un plan d'ajustement concret sur les exercices de sa séance actuelle (ex: réduction ou augmentation de charge en %, ajustement du RIR cible, temps de repos conseillé et justification biomécanique).`,
        config: {
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: 'Titre court du protocole d’ajustement',
              },
              summary: {
                type: Type.STRING,
                description: 'Explication biomécanique concise en 1 ou 2 phrases',
              },
              loadMultiplier: {
                type: Type.NUMBER,
                description: 'Multiplicateur de charge à appliquer aux séries non complétées (ex: 0.9 pour -10%, 1.025 pour +2.5%)',
              },
              targetRirDelta: {
                type: Type.INTEGER,
                description: 'Modification du RIR sur les séries restantes (ex: +1 pour garder plus de réserve, 0 pour maintenir)',
              },
              restSecondsDelta: {
                type: Type.INTEGER,
                description: 'Ajustement du temps de repos en secondes (ex: +30 ou -15)',
              },
              adjustmentsList: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
                description: 'Liste de 3 ajustements techniques précis',
              },
            },
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);
      res.json({ plan: parsed });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Erreur lors de la génération du protocole.';
      console.error('Gemini Adapt Error:', errMsg);
      res.status(500).json({ error: errMsg });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Wisport Bio-Adaptive Server running on http://localhost:${PORT}`);
  });
}

startServer();
