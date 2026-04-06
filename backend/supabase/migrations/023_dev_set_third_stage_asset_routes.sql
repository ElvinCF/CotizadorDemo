update dev.proyecto_configuracion_ui ui
   set mapa_svg_url = '/assets/project-overlays/arenas-malabrigo/tercera-etapa/overlay.tsx',
       mapa_webp_url = '/assets/proyectos/arenas-malabrigo/etapas/tercera-etapa/mapa_arenas_3.webp'
  from dev.proyectos p
 where ui.proyecto_id = p.id
   and p.slug = 'arenas-malabrigo-3';
