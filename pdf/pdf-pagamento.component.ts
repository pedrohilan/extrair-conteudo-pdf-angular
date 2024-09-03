import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { NgxMaskDirective, NgxMaskPipe } from 'ngx-mask';
import { firstValueFrom } from 'rxjs';
import { RemoverEspacosDirective } from '../../../../core/directive/ceramed-remover-espacos.directive';
import { FiltroPopulacaoContrapartidaDto } from '../../../../core/dtos/filtro-populacao-cotrapartida-dto';
import { PagamentoDto } from '../../../../core/dtos/pagamento-dto';
import { Programa } from '../../../../core/entities/programa';
import { MesEnum } from '../../../../core/enums/mes-enum';
import { PopulacaoContrapartidaService } from '../../../populacao-contrapartida/populacao-contrapartida.service';
import { ProgramaService } from '../../../programa/programa.service';

@Component({
  selector: 'pdf-registro',
  standalone: true,
  imports: [
    MatCardModule,
    MatIconModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatButtonModule,
    MatInputModule,
    MatAutocompleteModule,
    RemoverEspacosDirective,
    NgxMaskDirective,
    NgxMaskPipe,
    MatSelectModule,
    MatTableModule,
    MatPaginatorModule,
  ],
  templateUrl: './pdf-pagamento.component.html',
  styleUrl: './pdf-pagamento.component.scss',
})
export class PDFPagamentoComponent
  implements OnInit
{
  public programas: Array<Programa> = [];

  public anos: Array<string> = [];

  private servicoPrograma = inject(ProgramaService);

  private servicoPopulacaoContrapartida = inject(PopulacaoContrapartidaService);

  readonly QUANTIDADEMINIMACARACTERES: number = 2;

  @Input()
  conteudo!: Array<PagamentoDto>;

  public dataSource = new MatTableDataSource<PagamentoDto>();

  private dialog = inject(MatDialog);

  public meses: Array<MesEnum> = MesEnum.buscarValores();

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor() {
    super();
  }

  ngOnInit(): void {
    this.dataSource = new MatTableDataSource<PagamentoDto>(this.conteudo);
    this.criarFormulario();
    this.carregarAnos();
    this.adicionarIdsConteudo();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  adicionarIdsConteudo() {
    var idInicial = 1;
    this.conteudo.forEach((linha: PagamentoDto) => {
      linha.id = idInicial;
      idInicial++;
    });
  }

  private criarFormulario(): void {
    this.formulario = this.builderFormulario.group({
      ano: [null, [Validators.required]],
    });
  }

  setarMesSelecionado(mes: MesEnum | undefined, idLinha: string) {
    var indexLinha = this.conteudo.findIndex((x) => x.id == parseInt(idLinha));
    this.conteudo[indexLinha].mesReferencia = mes;
  }

  async abrirDialogoSelecionarPrograma(idLinha: string) {
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid) return;

    var indexLinha = this.conteudo.findIndex((x) => x.id == parseInt(idLinha));
    var programaSelecionado = this.conteudo[indexLinha].programa;

    var filtroPopulacaoContrapartida = new FiltroPopulacaoContrapartidaDto();
    filtroPopulacaoContrapartida.ano = this.formulario.get('ano')?.value;
    var programa = new Programa();
    programa.id = 2;
    filtroPopulacaoContrapartida.programa = programa;

    filtroPopulacaoContrapartida.municipio =
      this.conteudo[indexLinha].municipio;

    var populacao = await firstValueFrom(
      this.servicoPopulacaoContrapartida.buscarListaPor(
        filtroPopulacaoContrapartida
      )
    );

    if (!populacao) {
      console.log('Sem cadastro de população para o ano e programa informados');
      return;
    }

    var tetoMunicipalProgramaTeste =
      populacao[0].contrapartidaMunicipal * populacao[0].populacao;

    var programa = new Programa();
    programa.id = 3;
    filtroPopulacaoContrapartida.programa = programa;

    var populacao = await firstValueFrom(
      this.servicoPopulacaoContrapartida.buscarListaPor(
        filtroPopulacaoContrapartida
      )
    );

    var tetoMunicipalProgramaOutro =
      populacao[0].contrapartidaMunicipal * populacao[0].populacao;

    const dialogRef = this.dialog.open(
      DialogComponent,
      {
        data: {
          programaSelecionado: programaSelecionado,
          tituloAFB: '',
          tituloAFS: '',
          debitoMensalAFB: tetoMunicipalProgramaTeste / 12,
          debitoMensalAFS: tetoMunicipalProgramaOutro / 12,
        },
      }
    );
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        var indexLinha = this.conteudo.findIndex(
          (x) => x.id == parseInt(idLinha)
        );
        this.conteudo[indexLinha].programa = result;
      }
    });
  }

  public buscarPrograma(): void {
    if (
      this.formulario.get('programa')?.value.length >
      this.QUANTIDADEMINIMACARACTERES
    ) {
      this.servicoPrograma
        .buscarPorDescricao(this.formulario.get('programa')?.value)
        .subscribe((resposta) => {
          this.programas = resposta;
          if (!resposta) {
            console.log('Nenhum programa encontrado');
          }
        });
    } else {
      this.programas = [];
    }
  }

  public carregarAnos() {
    const dataAtual = new Date();
    const anoAtual = dataAtual.getFullYear();
    for (let ano = anoAtual; ano >= 2013; ano--) {
      this.anos.push(ano.toString());
    }
  }

  public converterEmFloat(campo: any): number {
    return parseFloat(campo);
  }

  colunas = [
    {
      def: 'municipio',
      cabecalho: 'Munícipio',
      conteudo: (element: PagamentoDto) => `${element.municipio.descricao}`,
      subconteudo: (element: PagamentoDto) => '',
    },
    {
      def: 'dataDebito',
      cabecalho: 'Data do débito',
      conteudo: (element: PagamentoDto) => `${element.dataDebito}`,
      subconteudo: (element: PagamentoDto) => '',
    },
    {
      def: 'valorDebitado',
      cabecalho: 'Valor debitado',
      conteudo: (element: PagamentoDto) =>
        `${this.converterEmFloat(element.valorDebitado)}`,
      subconteudo: (element: PagamentoDto) => '',
    },
    {
      def: 'mesReferencia',
      cabecalho: 'Mês de referência',
      conteudo: (element: PagamentoDto) => `${element.id}`,
      subconteudo: (element: PagamentoDto) =>
        element.mesReferencia ? `${element.mesReferencia.descricao}` : '',
    },
    {
      def: 'situacaoExtrato',
      cabecalho: 'Situação do extrato',
      conteudo: (element: PagamentoDto) =>
        `${element.situacaoExtrato.descricao}`,
      subconteudo: (element: PagamentoDto) => '',
    },
    {
      def: 'programa',
      cabecalho: 'Programa',
      conteudo: (element: PagamentoDto) => `${element.id}`,
      subconteudo: (element: PagamentoDto) => element.programa,
    },
  ];

  mostrarColunasDinamicas = this.colunas.map((coluna) => coluna.def);

  override buscarValoresFormulario(): Array<PagamentoDto> {
    let dto: Array<PagamentoDto> = [];

    this.conteudo.forEach((linha: PagamentoDto) => {
      linha.programa = linha.programa;
      linha.ano = this.formulario.get('ano')?.value;
      linha.codigoMunicipio = linha.codigoMunicipio;
      linha.municipio = linha.municipio;
      linha.dataDebito = linha.dataDebito;
      linha.valorDebitado = this.converterEmFloat(linha.valorDebitado);
      linha.mesReferencia = linha.mesReferencia;
      linha.situacaoExtrato = linha.situacaoExtrato;
      dto.push(linha);
    });

    return dto;
  }
}
