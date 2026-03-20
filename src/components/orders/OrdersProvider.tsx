import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiRequest } from "@/lib/apiClient";
import { order_api_endpoints } from "@/lib/orderApi";
import type {
  CreateOrderDocumentInput,
  CreateOrderInvoiceInput,
  CreateOrderRenewalInput,
  CreateWorkOrderInput,
  OrderActivityRecord,
  OrderDetailRecord,
  OrderDocumentRecord,
  OrderImplementationRecord,
  OrderInvoiceRecord,
  OrderPaymentRecord,
  OrderRenewalRecord,
  RecordOrderPaymentInput,
  WorkOrderRecord,
} from "@/types/order";

type OrdersPayload = {
  workOrders: WorkOrderRecord[];
  implementations: OrderImplementationRecord[];
  invoices: OrderInvoiceRecord[];
  payments: OrderPaymentRecord[];
  documents: OrderDocumentRecord[];
  renewals: OrderRenewalRecord[];
  activities: OrderActivityRecord[];
};

type ListResponse<T> = { data: T };
type EntityResponse<T> = { data: T };

interface OrdersContextValue {
  workOrders: WorkOrderRecord[];
  implementations: OrderImplementationRecord[];
  invoices: OrderInvoiceRecord[];
  payments: OrderPaymentRecord[];
  documents: OrderDocumentRecord[];
  renewals: OrderRenewalRecord[];
  activities: OrderActivityRecord[];
  accountManagers: string[];
  getWorkOrderById: (id: string) => WorkOrderRecord | null;
  getWorkOrderByOrderId: (order_id: string) => WorkOrderRecord | null;
  getOrderDetail: (order_id: string) => OrderDetailRecord | null;
  createWorkOrder: (input: CreateWorkOrderInput) => Promise<WorkOrderRecord>;
  createInvoice: (work_order_id: string, input: CreateOrderInvoiceInput) => Promise<OrderInvoiceRecord>;
  recordPayment: (work_order_id: string, input: RecordOrderPaymentInput) => Promise<OrderPaymentRecord>;
  createOrderDocument: (work_order_id: string, input: CreateOrderDocumentInput) => Promise<OrderDocumentRecord>;
  createRenewal: (work_order_id: string, input: CreateOrderRenewalInput) => Promise<OrderRenewalRecord>;
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

const sortDesc = <T,>(records: T[], value: (record: T) => string) =>
  [...records].sort((left, right) => value(right).localeCompare(value(left)));

export const OrdersProvider = ({ children }: { children: ReactNode }) => {
  const [workOrders, setWorkOrders] = useState<WorkOrderRecord[]>([]);
  const [implementations, setImplementations] = useState<OrderImplementationRecord[]>([]);
  const [invoices, setInvoices] = useState<OrderInvoiceRecord[]>([]);
  const [payments, setPayments] = useState<OrderPaymentRecord[]>([]);
  const [documents, setDocuments] = useState<OrderDocumentRecord[]>([]);
  const [renewals, setRenewals] = useState<OrderRenewalRecord[]>([]);
  const [activities, setActivities] = useState<OrderActivityRecord[]>([]);

  const loadOrders = async () => {
    try {
      const response = await apiRequest<ListResponse<OrdersPayload>>(order_api_endpoints.orders);
      setWorkOrders(response.data.workOrders ?? []);
      setImplementations(response.data.implementations ?? []);
      setInvoices(response.data.invoices ?? []);
      setPayments(response.data.payments ?? []);
      setDocuments(response.data.documents ?? []);
      setRenewals(response.data.renewals ?? []);
      setActivities(response.data.activities ?? []);
    } catch (error) {
      console.error("Orders load failed:", error);
    }
  };

  useEffect(() => {
    void loadOrders();

    const handleOrdersChanged = () => {
      void loadOrders();
    };

    window.addEventListener("crm:orders-changed", handleOrdersChanged);
    return () => {
      window.removeEventListener("crm:orders-changed", handleOrdersChanged);
    };
  }, []);

  const accountManagers = useMemo(
    () =>
      [...new Set(workOrders.map((order) => order.account_manager))].sort((left, right) =>
        left.localeCompare(right),
      ),
    [workOrders],
  );

  const getWorkOrderById = (id: string) => workOrders.find((order) => order.id === id) ?? null;

  const getWorkOrderByOrderId = (order_id: string) =>
    workOrders.find((order) => order.order_id === order_id) ?? null;

  const getOrderDetail = (order_id: string): OrderDetailRecord | null => {
    const workOrder = getWorkOrderByOrderId(order_id);

    if (!workOrder) {
      return null;
    }

    return {
      work_order: workOrder,
      implementation: implementations.find((item) => item.work_order_id === workOrder.id) ?? null,
      invoices: sortDesc(
        invoices.filter((item) => item.work_order_id === workOrder.id),
        (item) => item.invoice_date,
      ),
      payments: sortDesc(
        payments.filter((item) => item.work_order_id === workOrder.id),
        (item) => item.payment_date,
      ),
      documents: sortDesc(
        documents.filter((item) => item.work_order_id === workOrder.id),
        (item) => item.created_at,
      ),
      renewals: sortDesc(
        renewals.filter((item) => item.work_order_id === workOrder.id),
        (item) => item.renewal_date,
      ),
      activities: sortDesc(
        activities.filter((item) => item.work_order_id === workOrder.id),
        (item) => item.activity_date,
      ),
    };
  };

  const createWorkOrder = async (input: CreateWorkOrderInput) => {
    try {
      const response = await apiRequest<EntityResponse<WorkOrderRecord>>(order_api_endpoints.orders, {
        method: "POST",
        body: input,
      });
      await loadOrders();
      return response.data;
    } catch (error) {
      console.error("Create work order failed:", error);
      throw error;
    }
  };

  const createInvoice = async (work_order_id: string, input: CreateOrderInvoiceInput) => {
    const formData = new FormData();
    formData.set("invoice_number", input.invoice_number);
    formData.set("amount", String(input.amount));
    formData.set("invoice_date", input.invoice_date);
    formData.set("payment_status", input.payment_status);
    formData.set("file_url", input.file_url);
    if (input.file) {
      formData.set("file", input.file);
    }
    try {
      const response = await apiRequest<EntityResponse<OrderInvoiceRecord>>(
        order_api_endpoints.invoices(work_order_id),
        {
          method: "POST",
          formData,
        },
      );
      await loadOrders();
      return response.data;
    } catch (error) {
      console.error("Create invoice failed:", error);
      throw error;
    }
  };

  const recordPayment = async (work_order_id: string, input: RecordOrderPaymentInput) => {
    try {
      const response = await apiRequest<EntityResponse<OrderPaymentRecord>>(
        `${order_api_endpoints.order(work_order_id)}/payments`,
        {
          method: "POST",
          body: input,
        },
      );
      await loadOrders();
      return response.data;
    } catch (error) {
      console.error("Record payment failed:", error);
      throw error;
    }
  };

  const createOrderDocument = async (work_order_id: string, input: CreateOrderDocumentInput) => {
    const formData = new FormData();
    formData.set("file_name", input.file_name);
    formData.set("uploaded_by", input.uploaded_by);
    formData.set("file_url", input.file_url);
    if (input.file) {
      formData.set("file", input.file);
    }
    try {
      const response = await apiRequest<EntityResponse<OrderDocumentRecord>>(
        order_api_endpoints.documents(work_order_id),
        {
          method: "POST",
          formData,
        },
      );
      await loadOrders();
      return response.data;
    } catch (error) {
      console.error("Create order document failed:", error);
      throw error;
    }
  };

  const createRenewal = async (work_order_id: string, input: CreateOrderRenewalInput) => {
    try {
      const response = await apiRequest<EntityResponse<OrderRenewalRecord>>(
        order_api_endpoints.renewals(work_order_id),
        {
          method: "POST",
          body: input,
        },
      );
      await loadOrders();
      return response.data;
    } catch (error) {
      console.error("Create renewal failed:", error);
      throw error;
    }
  };

  return (
    <OrdersContext.Provider
      value={{
        workOrders,
        implementations,
        invoices,
        payments,
        documents,
        renewals,
        activities,
        accountManagers,
        getWorkOrderById,
        getWorkOrderByOrderId,
        getOrderDetail,
        createWorkOrder,
        createInvoice,
        recordPayment,
        createOrderDocument,
        createRenewal,
      }}
    >
      {children}
    </OrdersContext.Provider>
  );
};

export const useOrdersData = () => {
  const context = useContext(OrdersContext);

  if (!context) {
    throw new Error("useOrdersData must be used within OrdersProvider.");
  }

  return context;
};
