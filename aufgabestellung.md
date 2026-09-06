# Aufgabenstellung

1. Ein eigenes Programm (mit Code), dass aus mindestens zwei separaten Teilen besteht (z.B. Frontend und Backend, oder Client und Server)
    - Implementiere nach dem Prinzip einer 12 Factor App und dokumentiere, wie du die Faktoren umgesetzt hast in der README.md (es müssen nicht alle Aspekte umgesetzt werden, aber es muss klar sein, welche Aspekte umgesetzt wurden und wie)
2. Schreibe Dockerfiles für die beiden Teile und baue daraus Images
3. Erstelle alle nötigen Kubernetes Manifeste, um die beiden Teile in einem Cluster laufen zu lassen
4. Die beiden Teile sollen miteinander kommunizieren
5. Setze mindestens eine Technologie von der CNCF Landscape ein (z.B. Prometheus, Grafana, Jaeger, ArgoCD, Helm, ...) - Die Technologie muss in der README.md dokumentiert werden, wie sie eingesetzt wird und warum sie im Rahmen des Projekts sinnvoll ist