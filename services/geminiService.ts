import { GoogleGenAI } from "@google/genai";
import { Booking, Space } from '../types';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const modelId = "gemini-3-flash-preview";

export const generateSmartScheduleSuggestion = async (
  request: string,
  spaces: Space[],
  existingBookings: Booking[]
): Promise<string> => {
  try {
    const spacesStr = JSON.stringify(spaces.map(s => ({ id: s.id, name: s.name })));
    const bookingsStr = JSON.stringify(existingBookings.map(b => ({
      space: b.spaceId,
      start: b.startTime,
      duration: b.durationMinutes
    })));

    const prompt = `
      Tu es une IA experte en réception de centre de bien-être.
      Espaces actuels : ${spacesStr}
      Réservations du jour : ${bookingsStr}

      Demande utilisateur : "${request}"

      Basé sur la demande, suggère un créneau spécifique (Espace, Heure de début, Durée).
      Vérifie les conflits. S'il y a un conflit, suggère l'horaire disponible le plus proche.
      Réponds UNIQUEMENT en français, de manière concise et amicale.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });

    return response.text || "Désolé, je n'ai pas pu générer de suggestion.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Service IA indisponible. Vérifiez la clé API.";
  }
};

export const analyzeDailySentiment = async (bookings: Booking[]): Promise<string> => {
   try {
    const summary = bookings.map(b => `${b.serviceName} (${b.durationMinutes}m)`).join(', ');
    const prompt = `
      Analyse le planning du jour basé sur ces services : ${summary}.
      Donne un résumé de 2 phrases sur la charge opérationnelle (ex: "Forte demande en massage", "Matinée calme").
      Réponds en français, sur un ton professionnel.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });

    return response.text || "Pas d'analyse disponible.";
  } catch (error) {
    return "Analyse indisponible.";
  }
};
