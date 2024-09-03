import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import * as pdfjsLib from 'pdfjs-dist';

@Component({
  selector: 'import-pdf',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatIconModule, MatButtonModule],
  templateUrl: './import-pdf.component.html',
  styleUrl: './import-pdf.component.scss',
})
export class ImportPDFComponent {
  constructor() {
    (pdfjsLib as any).GlobalWorkerOptions.workerSrc =
      'assets/pdf.worker.min.mjs';
  }

  @Output()
  public conteudo = new EventEmitter<string>();

  importarPDF(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length !== 1) {
      console.log('Abra apenas um arquivo por vez');
      throw new Error();
    }

    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = () => {
        const typedarray = new Uint8Array(reader.result as ArrayBuffer);
        this.carregarConteudoPDF(typedarray);
      };

      reader.readAsArrayBuffer(file);
    }
  }

  async carregarConteudoPDF(pdfData: Uint8Array): Promise<void> {
    let textoExtraido: string = '';

    try {
      const loadingTask = pdfjsLib.getDocument(pdfData);
      const pdf = await loadingTask.promise;

      const promises = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        promises.push(
          pdf.getPage(i).then((page) => {
            return page.getTextContent().then((textContent) => {
              const pageText = textContent.items
                .map((item) => (item as any).str)
                .join(' ');
              textoExtraido += pageText + ' ';
            });
          })
        );
        await Promise.all(promises);
      }
      this.conteudo.emit(textoExtraido);
    } catch (error) {
      console.log('Erro ao carregar o PDF: ');
      throw new Error();
    }
  }
}
