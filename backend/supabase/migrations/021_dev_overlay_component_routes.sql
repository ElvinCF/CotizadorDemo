update dev.proyecto_configuracion_ui
   set mapa_svg_url = '/assets/project-overlays/arenas-malabrigo/segunda-etapa/overlay.tsx'
 where mapa_svg_url in (
   '/assets/proyectos/arenas-malabrigo/etapas/segunda-etapa/overlay.svg',
   '/assets/proyectos/arenas-malabrigo/overlay.svg'
 );
