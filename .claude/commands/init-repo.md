Inicializa un repositorio git en el directorio actual y conéctalo al repositorio remoto en GitHub.

URL del repositorio (formato SSH): $ARGUMENTS

Pasos:

1. Verificar que el directorio actual NO sea ya un repositorio git (`git rev-parse --is-inside-work-tree`). Si ya lo es, informar al usuario y detenerse.
2. Verificar que exista al menos un archivo en el directorio. Si está vacío, informar y detenerse.
3. Ejecutar `git init` y `git branch -M main`.
4. Agregar el remote origin con la URL proporcionada: `git remote add origin <URL>`.
5. Hacer `git add -A` para agregar todos los archivos.
6. Mostrar `git status` al usuario para que vea qué se va a commitear.
7. Crear el commit inicial con un mensaje descriptivo que resuma el contenido del proyecto.
8. Ejecutar `git push -u origin main`.
9. Confirmar al usuario que el push fue exitoso.
