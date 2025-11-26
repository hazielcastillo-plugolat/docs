from enum import Enum
from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


class EstadoPedido(str, Enum):
    pendiente = "pendiente"
    preparando = "preparando"
    entregado = "entregado"


class SaborBase(BaseModel):
    nombre: str = Field(..., min_length=3, max_length=50)
    descripcion: str = Field(..., min_length=10, max_length=160)
    disponible: bool = True


class Sabor(SaborBase):
    id: int


class PedidoBase(BaseModel):
    cliente: str = Field(..., min_length=3, max_length=80)
    sabor_id: int
    tamano: str = Field(..., pattern="^(cono|vaso|litro)$")
    estado: EstadoPedido = EstadoPedido.pendiente


class Pedido(PedidoBase):
    id: int


app = FastAPI(
    title="Cookies & Cream API",
    version="1.0.0",
    summary="Registra sabores y pedidos para la heladeria Cookies & Cream",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:4173",
        "http://localhost:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sabores: List[Sabor] = []
pedidos: List[Pedido] = []
sabor_id_seq = 1
pedido_id_seq = 1


@app.post("/sabores", response_model=Sabor, status_code=201)
def crear_sabor(sabor: SaborBase) -> Sabor:
    global sabor_id_seq
    nuevo = Sabor(id=sabor_id_seq, **sabor.dict())
    sabores.append(nuevo)
    sabor_id_seq += 1
    return nuevo


@app.get("/sabores", response_model=List[Sabor])
def listar_sabores(disponible: bool | None = None) -> List[Sabor]:
    if disponible is None:
        return sabores
    return [sabor for sabor in sabores if sabor.disponible == disponible]


@app.post("/pedidos", response_model=Pedido, status_code=201)
def crear_pedido(pedido: PedidoBase) -> Pedido:
    global pedido_id_seq
    sabor = next((s for s in sabores if s.id == pedido.sabor_id), None)
    if sabor is None or not sabor.disponible:
        raise HTTPException(status_code=400, detail="El sabor solicitado no existe o no esta disponible.")

    nuevo = Pedido(id=pedido_id_seq, **pedido.dict())
    pedidos.append(nuevo)
    pedido_id_seq += 1
    return nuevo


@app.get("/pedidos", response_model=List[Pedido])
def listar_pedidos() -> List[Pedido]:
    return pedidos


@app.get("/pedidos/{pedido_id}", response_model=Pedido)
def obtener_pedido(pedido_id: int) -> Pedido:
    pedido = next((p for p in pedidos if p.id == pedido_id), None)
    if pedido is None:
        raise HTTPException(status_code=404, detail="Pedido no encontrado.")
    return pedido


@app.get("/pedidos/{pedido_id}/estado")
def estado_pedido(pedido_id: int) -> dict:
    pedido = next((p for p in pedidos if p.id == pedido_id), None)
    if pedido is None:
        raise HTTPException(status_code=404, detail="Pedido no encontrado.")
    return {"pedido_id": pedido.id, "estado": pedido.estado}
