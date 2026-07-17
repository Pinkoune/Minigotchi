// Maps each game form to its Kenney "Cube Pets" animal (CC0 — see
// public/assets/ATTRIBUTIONS.md). The egg stage keeps its own 2D art.

export const FORM_ANIMAL: Record<string, string> = {
  blobby: 'chick', // bébé
  roundy: 'bunny', // enfant, bons soins
  spiky: 'hog', // enfant, soins négligés
  flutter: 'bee', // ado joueur
  bricky: 'beaver', // ado têtu
  aureli: 'lion', // adulte, soins parfaits
  midori: 'panda', // adulte équilibré
  grumbo: 'crab', // adulte grognon
  chonko: 'pig', // adulte en surpoids
  sagey: 'elephant', // senior sage
  creaky: 'polar', // senior fatigué
}

export const animalModelUrl = (formId: string): string | null => {
  const animal = FORM_ANIMAL[formId]
  return animal ? `/assets/pets/animal-${animal}.glb` : null
}

export const animalPreviewUrl = (formId: string): string | null => {
  const animal = FORM_ANIMAL[formId]
  return animal ? `/assets/pets/previews/animal-${animal}.png` : null
}
