/** Réglages du thème, partagés entre le script de <head> (layout.tsx, côté serveur) et lib/theme.ts. */
export const CLE_THEME = "caisse-theme";
export const HEURE_SOIR = 19;
export const HEURE_MATIN = 7;

/**
 * Applique le thème avant le premier affichage, pour éviter un éclair de fond clair en pleine salle.
 * Même logique que resoudre() dans lib/theme.ts.
 */
export const SCRIPT_THEME = `(function(){var c="auto";try{c=localStorage.getItem("${CLE_THEME}")||"auto";}catch(e){}
var h=new Date().getHours();var soir=h>=${HEURE_SOIR}||h<${HEURE_MATIN};
var sys=!!(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches);
var n=c==="noire"||(c==="auto"&&(soir||sys));
document.documentElement.setAttribute("data-salle",n?"noire":"claire");})();`;
