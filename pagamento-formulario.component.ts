import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  Signal,
  ViewChild,
  WritableSignal,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router } from '@angular/router';
import { provideNgxMask } from 'ngx-mask';
import { firstValueFrom } from 'rxjs';
import { PagamentoDto } from '../../../core/dtos/pagamento-dto';
import { Pagamento } from '../../../core/entities/pagamento';
import { Rotas } from '../../../core/enums/rotas.enum';
import { SituacaoExtratoEnum } from '../../../core/enums/situacao-extrato-enum';
import { MunicipioService } from '../../../core/services/municipio.service';
import { ImportPDFComponent } from '../../../shared/import-pdf/import-pdf.component';
import { FinanceiroService } from './../financeiro.service';
import { PDFPagamentoComponent } from './pdf/pdf-pagamento.component';

@Component({
  selector: 'cadastro-informacoes-pdf',
  standalone: true,
  imports: [
    PDFPagamentoComponent
  ],
  providers: [provideNgxMask()],
  templateUrl: './pagamento-formulario.component.html',
  styleUrl: './pagamento-formulario.component.scss',
})
export class PagamentoFormularioComponent implements OnInit {

  @ViewChild(PDFPagamentoComponent)
  private pdfPagamento!: PDFPagamentoComponent;

  public conteudoPDF: WritableSignal<Array<PagamentoDto>> = signal([]);

  ngOnInit(): void {
  }

  public setconteudoPDF(conteudo: Array<PagamentoDto>): void {
    this.conteudoPDF.set(conteudo);
  }

  async montarArrayPagamentos(textoExtraido: string) {
    var lista = textoExtraido.split(
      '___________________________________________________________________________  '
    );

    var conteudo = new Array<PagamentoDto>();

    let municipioBlocoIncompleto = '',
      valorBlocoIncompleto = '',
      dataBlocoIncompleto = '',
      situacaoBlocoIncompleto = '';

    for (var i = 1; lista.length > i; i++) {
      var blocoAtual = lista[i].split(/:\s*/);
      const resultBlocoAtual: any = {};

      for (let i = 0; i < blocoAtual.length - 1; i++) {
        const key = blocoAtual[i]
          .substring(blocoAtual[i].lastIndexOf(' ', blocoAtual[i].length - 1))
          .trim()
          .replaceAll('.', '');
        const value = blocoAtual[i + 1]
          .substring(0, blocoAtual[i + 1].lastIndexOf(' '))
          .trim();
        resultBlocoAtual[key] = value;
      }

      if (resultBlocoAtual.Nome && !resultBlocoAtual.Valor) {
        municipioBlocoIncompleto = resultBlocoAtual.Nome;
      }
      if (resultBlocoAtual.Valor && !resultBlocoAtual.Nome) {
        valorBlocoIncompleto = resultBlocoAtual.Valor;
      }
      if (resultBlocoAtual.Data && !resultBlocoAtual.Nome) {
        dataBlocoIncompleto = resultBlocoAtual.Data;
      }
      if (resultBlocoAtual.Situação && !resultBlocoAtual.Nome) {
        situacaoBlocoIncompleto = resultBlocoAtual.Situação;
      }

      if (
        municipioBlocoIncompleto != '' &&
        valorBlocoIncompleto != '' &&
        dataBlocoIncompleto != '' &&
        situacaoBlocoIncompleto != ''
      ) {
        var linha = await this.montarLinhaPagamentos(
          municipioBlocoIncompleto,
          valorBlocoIncompleto,
          dataBlocoIncompleto,
          situacaoBlocoIncompleto
        );
        conteudo.push(linha);

        municipioBlocoIncompleto = '';
        valorBlocoIncompleto = '';
        dataBlocoIncompleto = '';
        situacaoBlocoIncompleto = '';
      }

      if (
        resultBlocoAtual.Nome &&
        resultBlocoAtual.Valor &&
        resultBlocoAtual.Data &&
        resultBlocoAtual.Situação
      ) {
        var linha = await this.montarLinhaPagamentos(
          resultBlocoAtual.Nome,
          resultBlocoAtual.Valor,
          resultBlocoAtual.Data,
          resultBlocoAtual.Situação
        );
        conteudo.push(linha);
      }
    }

    if (
      municipioBlocoIncompleto != '' &&
      valorBlocoIncompleto != '' &&
      dataBlocoIncompleto != '' &&
      situacaoBlocoIncompleto != ''
    ) {
      var linha = await this.montarLinhaPagamentos(
        municipioBlocoIncompleto,
        valorBlocoIncompleto,
        dataBlocoIncompleto,
        situacaoBlocoIncompleto
      );
      conteudo.push(linha);

      municipioBlocoIncompleto = '';
      valorBlocoIncompleto = '';
      dataBlocoIncompleto = '';
      situacaoBlocoIncompleto = '';
    }

    this.setconteudoPDF(conteudo);
  }

  private async montarLinhaPagamentos(
    nomeMunicpio: string,
    valor: string,
    data: string,
    situacao: string
  ): Promise<PagamentoDto> {
    var municipio = await firstValueFrom(
      this.servicoMunicpio.buscarMunicipioSemAcento(
        nomeMunicpio.toString().split(',')[0].replace(/\s+/g, ' ').trim(),
        10
      )
    );
    var linha = new PagamentoDto();
    linha.municipio = municipio;
    linha.valorDebitado = parseFloat(valor.replace('.', '').replace(',', '.'));

    let dataString = data;
    let partesData = dataString.split('/');

    let dataConvertida = new Date(
      +partesData[2],
      +partesData[1] - 1,
      +partesData[0]
    );

    linha.dataDebito = dataConvertida;
    var situacaoEnum = SituacaoExtratoEnum.buscarPorDescricao(
      situacao.replace(/\s+/g, ' ').trim()
    );
    linha.situacaoExtrato =
      situacaoEnum == undefined
        ? SituacaoExtratoEnum.DEBITO_NAO_EFETUADO_INSUFICIENCIA
        : situacaoEnum;
    return linha;
  }

  public salvarPDF(dto: Array<PagamentoDto>): void {
    for (var i = 0; i < dto.length; i++) {
      if (!dto[i].programa) {
        console.log('Preencha o(s) programa(s) corretamente');
        return;
      }
    }

    for (var i = 0; i < dto.length; i++) {
      if (!dto[i].mesReferencia) {
        console.log('Preencha o(s) mes(es) corretamente');
        return;
      }
    }

    this.servico.salvarLista(dto).subscribe({
      error: (erro) =>
        console.log(erro.error.msg, [
          'failure-snackbar',
        ]),
      complete: () => {
        console.log('Cadastro realizado com sucesso.')
      },
    });
  }

  public cancelarCadastroPDFPagamento(): void {
    this.conteudoPDF.set([]);
  }
}
