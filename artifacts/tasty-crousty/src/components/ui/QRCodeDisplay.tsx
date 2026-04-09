import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./card";
import { Shield, CheckCircle2 } from "lucide-react";

interface QRCodeDisplayProps {
  token: string;
  orderNumber?: string;
  orderId?: number;
  isUsed?: boolean;
}

export function QRCodeDisplay({ token, orderNumber, orderId, isUsed }: QRCodeDisplayProps) {
  const displayLabel = orderNumber ?? (orderId ? `#${orderId}` : "");

  return (
    <Card className="w-full max-w-sm mx-auto overflow-hidden border-2 border-primary/20">
      <CardHeader className="text-center bg-gradient-to-b from-primary/10 to-primary/5 pb-4 pt-5">
        <div className="flex justify-center mb-2">
          <div className="p-2 bg-primary/10 rounded-full">
            <Shield className="w-5 h-5 text-primary" />
          </div>
        </div>
        <CardTitle className="text-base">Code de livraison sécurisé</CardTitle>
        {displayLabel && <CardDescription className="text-xs mt-0.5">Commande {displayLabel}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center p-6">
        {isUsed ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
            <p className="text-sm font-semibold text-green-700">QR code utilisé</p>
            <p className="text-xs text-slate-500 text-center">Ce code a déjà été scanné lors de la livraison.</p>
          </div>
        ) : (
          <>
            <div className="bg-white p-4 rounded-xl shadow-sm border-2 border-slate-100">
              <QRCodeSVG value={token} size={180} level="H" includeMargin />
            </div>
            <div className="mt-4 text-center space-y-1">
              <p className="text-xs font-medium text-slate-700">Présentez ce code à votre livreur</p>
              <p className="text-xs text-slate-400">lors de la remise de votre commande</p>
            </div>
            <div className="mt-3 px-3 py-2 bg-amber-50 rounded-lg border border-amber-100 w-full">
              <p className="text-xs text-amber-700 text-center font-medium">
                ⚡ PrepLock™ — Sécurisé par food delivery
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
